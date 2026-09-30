exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

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
    const { imageBase64, mediaType, childName, gender, ageLabel, grade,
            weeklyHabits, previousReports, dadName, momName } = body;

    // Build context from app data
    const habitContext = weeklyHabits
      ? `Esta semana en FamyBloom:
- Deberes completados: ${weeklyHabits.completed} de ${weeklyHabits.total}
- Días con actividad: ${weeklyHabits.daysActive} de 5
- Racha actual: ${weeklyHabits.streak} días
- Puntos ganados: ${weeklyHabits.pts}`
      : '';

    const historyContext = previousReports && previousReports.length > 0
      ? `Reportes anteriores (${previousReports.length} semanas previas):
${previousReports.slice(-3).map(r =>
  `- Semana del ${r.date}: ${r.summary}`
).join('\n')}`
      : 'Es el primer reporte cargado.';

    const prompt = `Eres un experto en educación infantil y desarrollo de niños. Vas a analizar el reporte semanal escolar de ${childName}.

DATOS DEL ESTUDIANTE:
- Nombre: ${childName} (${gender})
- Edad: ${ageLabel}
- Grado: ${grade || 'No especificado'}
- Padres: ${dadName || 'Papá'} y ${momName || 'Mamá'}

CONTEXTO DE HÁBITOS EN CASA (FamyBloom):
${habitContext || 'Sin datos de hábitos esta semana.'}

HISTORIAL:
${historyContext}

INSTRUCCIONES DE ANÁLISIS:
Analiza el reporte escolar de la imagen y responde ÚNICAMENTE con un objeto JSON válido sin markdown:

{
  "period": "período del reporte (ej: 30 marzo - 10 abril)",
  "grade": "grado del estudiante",
  "overallScore": "Excelente|Bien|Regular|Necesita apoyo",
  "criteria": [
    {"name": "nombre del criterio", "level": "Generalmente|Ocasionalmente|Puede Mejorar", "icon": "emoji relevante"}
  ],
  "teacherComment": "resumen del comentario del maestro en 2-3 oraciones en español, tono cálido",
  "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "opportunities": ["área de mejora 1", "área de mejora 2"],
  "parentInsights": "mensaje directo para ${dadName || 'papá'} y ${momName || 'mamá'} en 3-4 oraciones, tono cálido y accionable, mencionando conexiones con los hábitos en casa si aplica",
  "weeklyFocus": "1 acción concreta específica que los padres pueden hacer esta semana en casa",
  "trend": "mejorando|estable|necesita atención",
  "trendNote": "explicación breve de la tendencia comparada con semanas anteriores (si hay historial)",
  "spokenSummary": "resumen de 4-5 oraciones para leer en voz alta a los padres, tono conversacional y cálido, como si fuera una maestra hablando directamente a ${dadName || 'papá'} y ${momName || 'mamá'}"
}

Reglas estrictas:
- Si un criterio no aparece en la imagen, no lo incluyas
- Traduce todos los textos al español cálido y comprensible para padres
- El spokenSummary debe sonar natural al escucharse, no como un informe
- Conecta lo escolar con los hábitos del hogar cuando sea relevante
- Sé específico y accionable, no genérico`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1800,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64
              }
            },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!res.ok) throw new Error(`API error: ${res.status} - ${await res.text()}`);
    const data = await res.json();
    const raw = data.content.map(x => x.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { statusCode: 200, headers, body: JSON.stringify(parsed) };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
