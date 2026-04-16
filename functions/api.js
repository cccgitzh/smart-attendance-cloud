export async function onRequest(context) {
  const { request, env } = context;
  const key = "global_attendance_state"; // KV 数据库中的固定键名

  // 处理 GET 请求：前端拉取云端数据
  if (request.method === "GET") {
    try {
      const data = await env.ATTENDANCE_KV.get(key);
      return new Response(data || "{}", {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "KV Read Error" }), { status: 500 });
    }
  }

  // 处理 POST 请求：前端向云端推送新数据
  if (request.method === "POST") {
    try {
      const body = await request.text();
      await env.ATTENDANCE_KV.put(key, body);
      return new Response("OK");
    } catch (error) {
      return new Response("KV Write Error", { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
}
