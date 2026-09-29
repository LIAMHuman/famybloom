exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { childName, ageMonths, ageLabel, gender } = JSON.parse(event.body);

    const prompt = `Eres un experto en desarrollo infantil. Analiza a un ${gender} llamado ${childName}, de ${ageLabel} (${ageMonths} meses de edad).

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin bloques markdown:

{
  "physical": [{"label": "hito", "done": true, "current": false}],
  "cognitive": [{"label": "hito", "done": true, "current": false}],
  "emotional": [{"label": "hito", "done": true, "current": false}],
  "language":  [{"label": "hito", "done": true, "current": false}],
  "activities": [{"icon": "emoji", "text": "actividad recomendada"}],
  "tip": "consejo práctico para los padres (máximo 2 líneas)"
}

Reglas estrictas:
- Exactamente 5-6 hitos por área basados en estándares OMS, CDC y AAP
- done=true si el hito ya debería estar logrado a los ${ageMonths} meses
- current=true SOLO para el hito que están trabajando ahora (máximo 1 por área, puede ser false en todos)
- done y current no pueden ser true al mismo tiempo
- 5 actividades con emojis apropiados para la edad
- tip: consejo cálido y práctico para los padres`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
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

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const raw = data.content.map(x => x.text || '').join('');
    // Clean any accidental markdown fences
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed)
    };

  } catch (error) {
    console.error('Crecer function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
