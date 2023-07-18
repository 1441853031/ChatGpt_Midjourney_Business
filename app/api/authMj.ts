import { NextRequest } from "next/server";
import { getServerSideConfig } from "../config/server";
import md5 from "spark-md5";
import { ACCESS_CODE_PREFIX } from "../constant";
import { OPENAI_URL } from "./common";

function getIP(req: NextRequest) {
  let ip = req.ip ?? req.headers.get("x-real-ip");
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (!ip && forwardedFor) {
    ip = forwardedFor.split(",").at(0) ?? "";
  }

  return ip;
}

function parseApiKey(bearToken: string) {
  const token = bearToken.trim().replaceAll("Bearer ", "").trim();
  const isOpenAiKey = !token.startsWith(ACCESS_CODE_PREFIX);

  return {
    accessCode: isOpenAiKey ? "" : token.slice(ACCESS_CODE_PREFIX.length),
    apiKey: isOpenAiKey ? token : "",
  };
}

export function authMj(req: NextRequest, skipCustomKey = true) {
  const authToken =
    req.headers.get("Authorization") ??
    req.nextUrl.searchParams.get("Authorization") ??
    "";

  // check if it is openai api key or user token
  const { accessCode, apiKey: token } = parseApiKey(authToken);

  const hashedCode = md5.hash(accessCode ?? "").trim();

  const serverConfig = getServerSideConfig();
  console.log("[Auth] allowed hashed codes: ", [...serverConfig.codes]);
  console.log("[Auth] got access code:", accessCode);
  console.log("[Auth] hashed access code:", hashedCode);
  console.log("[User IP] ", getIP(req));
  console.log("[Time] ", new Date().toLocaleString());
  const now: Date = new Date();
  const year: number = now.getFullYear();
  const month: number = now.getMonth() + 1;
  const day: number = now.getDate();
  if (serverConfig.needCode && serverConfig.codes2.has(accessCode) && !token) {
    const da =
      year + (month < 10 ? "0" : "") + month + (day < 10 ? "0" : "") + day;
    console.log("日期" + da);
    if (accessCode.substring(accessCode.length - 8) < da) {
      return {
        error: true,
        msg: !accessCode ? "请在设置填写授权码" : "授权码过期，请重新购买",
      };
    }
    if (accessCode.substring(0, 2) != "KM") {
      return {
        error: true,
        msg: !accessCode ? "请在设置填写授权码" : "请使用绘画授权码!!!!",
      };
    }
  }

  if (serverConfig.needCode && !serverConfig.codes.has(hashedCode)) {
    if (!token || !skipCustomKey) {
      return {
        error: true,
        msg: !accessCode ? "请在设置填写授权码" : "授权码不正确或为空",
      };
    }
  }

  // if user does not provide an api key, inject system api key
  if (!token) {
    const apiKey = serverConfig.apiKey;
    if (apiKey) {
      console.log("[Auth] use system api key");
      req.headers.set("Authorization", `Bearer ${apiKey}`);
    } else {
      console.log("[Auth] admin did not provide an api key");
    }
  } else {
    console.log("[Auth] use user api key");
  }

  return {
    error: false,
  };
}
