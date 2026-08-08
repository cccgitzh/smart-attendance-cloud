export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 🛡️ 1. 定义访问口令（可自行修改）
  const ADMIN_CODE = "888888"; // 管理员口令（可修改/保存数据）
  const USER_CODE = "123456";  // 普通成员口令（仅可查看）

  // 2. 检查 Cookie 中的通行证
  const cookies = request.headers.get("Cookie") || "";
  const isAdmin = new RegExp(`(?:^|;\\s*)auth_token=${ADMIN_CODE}(?:;|$)`).test(cookies);
  const isUser = new RegExp(`(?:^|;\\s*)auth_token=${USER_CODE}(?:;|$)`).test(cookies);

  // 3. 已经验证过口令（无论是管理员还是普通用户），直接放行
  if (isAdmin || isUser) {
    return next();
  }

  // 4. 处理登录提交
  if (request.method === "POST" && url.pathname === "/login") {
    const formData = await request.formData();
    const code = formData.get("code");
    
    if (code === ADMIN_CODE || code === USER_CODE) {
      const role = code === ADMIN_CODE ? "admin" : "user";
      // 发送包含了 auth_token 和 user_role 的 Cookie
      const headers = new Headers({
        "Location": "/",
      });
      headers.append("Set-Cookie", `auth_token=${code}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
      headers.append("Set-Cookie", `user_role=${role}; Path=/; Secure; SameSite=Lax; Max-Age=2592000`); // 前端可读取此属性显示/隐藏界面

      return new Response("Login Success", {
        status: 302,
        headers
      });
    } else {
      return new Response("Login Failed", {
        status: 302,
        headers: { "Location": "/?error=1" }
      });
    }
  }

  // 5. 显示登录界面
  const errorMsg = url.searchParams.get("error") 
    ? "<p style='color: #DC2626; font-size: 14px; font-weight: bold;'>❌ 口令错误，请重试</p>" 
    : "";
  
  const loginHTML = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>企业内部系统 - 安全验证</title>
    <style>
      body { font-family: -apple-system, sans-serif; background: #F4F5F7; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
      .login-box { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; width: 320px; border: 1px solid #E2E8F0; }
      .title { font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 12px; }
      .subtitle { font-size: 12px; color: #64748B; margin-bottom: 24px; }
      input { padding: 12px; border: 2px solid #E2E8F0; border-radius: 8px; width: 100%; box-sizing: border-box; margin-bottom: 16px; text-align: center; font-size: 16px; outline: none; transition: 0.2s; }
      input:focus { border-color: #4F46E5; }
      button { background: #0F172A; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; width: 100%; transition: 0.2s; }
      button:hover { background: #4F46E5; }
    </style>
  </head>
  <body>
    <div class="login-box">
      <div class="title">🏢 内部考勤系统</div>
      <div class="subtitle">管理员与只读人员统一登录入口</div>
      ${errorMsg}
      <form method="POST" action="/login">
        <input type="password" name="code" placeholder="请输入访问口令" required autofocus autocomplete="off">
        <button type="submit">进入系统</button>
      </form>
    </div>
  </body>
  </html>
  `;

  return new Response(loginHTML, {
    headers: { "Content-Type": "text/html;charset=UTF-8" }
  });
}
