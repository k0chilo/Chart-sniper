export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY nao configurada no servidor." });
  }
  try {
    const { scenario, userChoice, isCorrect, streak, hint, correct } = req.body || {};
    const prompt = `Voce e um mentor de trading profissional. O aluno esta treinando leitura de grafico.

Setup: ${hint || scenario}
Resposta correta: ${correct}
Resposta do aluno: ${userChoice}
Acertou: ${isCorrect ? "SIM" : "NAO"}
Streak atual: ${streak}

De um feedback CURTO (2-3 linhas) e DIRETO. Se acertou: reforce o raciocinio correto. Se errou: explique o que deve ser visto. Use linguagem de trader. Sem enrolacao. Responda em portugues.`;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 220,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: "Falha na API Anthropic", detail: text.slice(0, 400) });
    }
    const data = await r.json();
    const feedback = data?.content?.[0]?.text?.trim() || "Analise o contexto e o fluxo antes de decidir.";
    return res.status(200).json({ feedback });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno", detail: String(err?.message || err) });
  }
}
