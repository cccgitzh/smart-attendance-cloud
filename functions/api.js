export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // 1. 获取前端传来的月份，实现按月分库。如果没有传，默认用 fallback
  const month = url.searchParams.get('month') || 'fallback';
  const key = `attendance_${month}`;

  // 处理 GET 请求：拉取数据
  if (request.method === "GET") {
    try {
      const dataStr = await env.ATTENDANCE_KV.get(key);
      if (!dataStr) {
        // 如果该月没数据，返回特定的空状态信号
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

  // 处理 POST 请求：保存数据（带有防覆盖逻辑）
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { state, _version } = body;

      // 2. 防覆盖（乐观锁）：提取云端当前的数据
      const currentDataStr = await env.ATTENDANCE_KV.get(key);
      if (currentDataStr) {
        const currentData = JSON.parse(currentDataStr);
        // 如果云端的版本号存在，且与前端传来的版本号不一致，说明有人抢先修改了！
        if (currentData._version && currentData._version !== _version) {
          return new Response(JSON.stringify({ error: "CONFLICT" }), { status: 409 });
        }
      }

      // 3. 验证通过：生成新的时间戳版本号，并安全存入
      const newVersion = Date.now().toString();
      const payloadToSave = JSON.stringify({ state, _version: newVersion });
      
      await env.ATTENDANCE_KV.put(key, payloadToSave);

      // 将新版本号返回给前端
      return new Response(JSON.stringify({ _version: newVersion }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response("KV Write Error", { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
}
