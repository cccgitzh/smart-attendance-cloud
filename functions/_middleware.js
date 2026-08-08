export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 🛡️ 1. 定义你的企业统一访问口令（可以自行修改）
  const SECRET_CODE = "888888"; 

  // 2. 检查访问者手里有没有“通行证”（Cookie）
  const cookies = request.headers.get("Cookie") || "";
  // 修复：使用严格正则匹配 Cookie 边界，防止攻击者通过构造带类似子串的 Cookie 绕过鉴权
  const authPattern = new RegExp(`(?:^|;\\s*)auth_token=${SECRET_CODE}(?:;|$)`);
  const isAuth = authPattern.test(cookies);

  // 3. 如果已经验证过口令，直接放行，让他去访问网页或 API
  if (isAuth) {
    return next();
  }

  // 4. 如果访问者正在提交口令表单
  if (request.method === "POST" && url.pathname === "/login") {
    const formData = await request.formData();
    const code = formData.get("code");
    
    if (code === SECRET_CODE) {
      // ✅ 口令正确：给他发一张有效期 30 天的通行证（Cookie），并让他进入首页
      // 修复：加入 Secure 与 SameSite=Lax 增强浏览器安全性，防止跨站或重定向时丢失 Cookie
      return new Response("Login Success", {
        status: 302,
        headers: {
          "Location": "/",
          "Set-Cookie": `auth_token=${SECRET_CODE}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`, // 30天免密
        }
      });
    } else {
      // ❌ 口令错误：打回原回，并带上错误提示
      return new Response("Login Failed", {
        status: 302,
        headers: { "Location": "/?error=1" }
      });
    }
  }

  // 5. 如果没有通行证，也不是在提交表单，一律拦截并显示极简登录页
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
      .title { font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 24px; }
      input { padding: 12px; border: 2px solid #E2E8F0; border-radius: 8px; width: 100%; box-sizing: border-box; margin-bottom: 16px; text-align: center; font-size: 16px; outline: none; transition: 0.2s; }
      input:focus { border-color: #4F46E5; }
      button { background: #0F172A; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; width: 100%; transition: 0.2s; }
      button:hover { background: #4F46E5; }
    </style>
  </head>
  <body>
    <div class="login-box">
      <div class="title">🏢 内部考勤系统</div>
      ${errorMsg}
      <form method="POST" action="/login">
        <input type="password" name="code" placeholder="请输入企业访问口令" required autofocus autocomplete="off">
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
