export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const ADMIN_CODE = "888888"; // 与 _middleware.js 保持一致
  
  const month = url.searchParams.get('month') || 'fallback';
  const key = `attendance_${month}`;

  // 处理 GET 请求：拉取数据（所有人均可读取）
  if (request.method === "GET") {
    try {
      const dataStr = await env.ATTENDANCE_KV.get(key);
      if (!dataStr) {
        return new Response(JSON.stringify({ isEmpty: true }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      return new Response(dataStr, {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "KV Read Error" }), { status: 500 });
    }
  }

  // 处理 POST 请求：保存数据（拦截非管理员操作）
  if (request.method === "POST") {
    // 🛡️ 校验是否为管理员发起的修改请求
    const cookies = request.headers.get("Cookie") || "";
    const isAdmin = new RegExp(`(?:^|;\\s*)auth_token=${ADMIN_CODE}(?:;|$)`).test(cookies);

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "FORBIDDEN", message: "您是普通只读用户，无权修改排班数据" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const body = await request.json();
      const { state, _version } = body;

      // 防覆盖（乐观锁）
      const currentDataStr = await env.ATTENDANCE_KV.get(key);
      if (currentDataStr) {
        const currentData = JSON.parse(currentDataStr);
        if (currentData._version && currentData._version !== _version) {
          return new Response(JSON.stringify({ error: "CONFLICT" }), { status: 409 });
        }
      }

      // 生成新版本号存入 KV
      const newVersion = Date.now().toString();
      const payloadToSave = JSON.stringify({ state, _version: newVersion });
      
      await env.ATTENDANCE_KV.put(key, payloadToSave);

      return new Response(JSON.stringify({ _version: newVersion }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response("KV Write Error", { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
}
