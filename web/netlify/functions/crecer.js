exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(event.body);

    // ── CARTA DEL FUTURO ──────────────────────────────────────
    if (body.type === 'letter') {
      const { childName, ageLabel, gender, dadName, momName,
              weekPts, ptsName, streak, petName, petStage, familyName } = body;

      const prompt = `Eres un escritor creativo y experto en desarrollo infantil. Escribe una carta emotiva y hermosa en español.

La carta está escrita por ${childName} a los 18 años, dirigida a sí mismo/a cuando tenía ${ageLabel} de edad.

Contexto:
- ${childName} (${gender}) cumplió TODOS sus deberes esta semana
- Ganó ${weekPts} ${ptsName} esta semana
- Lleva ${streak} días seguidos cumpliendo sus deberes
- Su mascota virtual es un ${petName} en etapa ${petStage}
- Sus papás se llaman ${dadName} y ${momName}
- Familia: ${familyName}

Instrucciones:
- Tono cálido, emotivo y esperanzador
- Menciona los deberes, la mascota y los puntos
- Conecta los hábitos de hoy con logros del futuro
- Máximo 200 palabras
- Comienza con "Querido/a ${childName}," y termina con firma emotiva
- Solo texto plano, sin asteriscos ni markdown

Responde ÚNICAMENTE con el texto de la carta.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!res.ok) throw new Error(`API error: ${res.status} - ${await res.text()}`);
      const data = await res.json();
      const letter = data.content.map(x => x.text || '').join('').trim();
      return { statusCode: 200, headers, body: JSON.stringify({ letter }) };
    }

    // ── ANÁLISIS CRECER ───────────────────────────────────────
    const { childName, ageMonths, ageLabel, gender } = body;

    const prompt = `Eres un experto en desarrollo infantil. Analiza a un ${gender} llamado ${childName}, de ${ageLabel} (${ageMonths} meses).

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques markdown:

{
  "physical":   [{"label": "hito", "done": true, "current": false}],
  "cognitive":  [{"label": "hito", "done": true, "current": false}],
  "emotional":  [{"label": "hito", "done": true, "current": false}],
  "language":   [{"label": "hito", "done": true, "current": false}],
  "activities": [{"icon": "emoji", "text": "actividad recomendada"}],
  "tip": "consejo práctico para los padres (máximo 2 líneas)"
}

Reglas:
- 5-6 hitos por área, basados en estándares OMS/CDC/AAP
- done=true si el hito ya debería estar logrado a los ${ageMonths} meses
- current=true SOLO para el hito en progreso ahora (máximo 1 por área)
- done y current nunca pueden ser true al mismo tiempo
- 5 actividades con emojis apropiados para la edad
- tip: consejo cálido y práctico`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) throw new Error(`API error: ${res.status} - ${await res.text()}`);
    const data = await res.json();
    const raw = data.content.map(x => x.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { statusCode: 200, headers, body: JSON.stringify(parsed) };

  } catch (error) {
    console.error('FamyBloom function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
