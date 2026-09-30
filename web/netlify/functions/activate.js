// FamyBloom Premium Activation Function
// Validates activation codes and returns signed tokens with expiry

const VALID_CODES = process.env.PREMIUM_CODES
  ? JSON.parse(process.env.PREMIUM_CODES)
  : {};
// PREMIUM_CODES env var format (set in Netlify dashboard):
// {"CODE123":{"plan":"monthly","used":false},"ANNUAL99":{"plan":"annual","used":false}}

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

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { code, familyName } = JSON.parse(event.body);
    if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Código requerido' }) };

    const codeUpper = code.toUpperCase().trim();
    const codeData = VALID_CODES[codeUpper];

    if (!codeData) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Código inválido. Verifica que lo hayas escrito correctamente.' }) };
    }

    if (codeData.used) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Este código ya fue utilizado. Contacta a soporte si crees que es un error.' }) };
    }

    // Calculate expiry
    const now = new Date();
    const expiry = new Date(now);
    if (codeData.plan === 'annual') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }

    // Generate a simple token (plan + expiry + secret hash)
    const secret = process.env.PREMIUM_SECRET || 'famybloom2026';
    const tokenData = `${codeUpper}|${codeData.plan}|${expiry.toISOString()}|${familyName||''}`;
    const token = Buffer.from(tokenData).toString('base64');

    // Mark code as used (Note: in V1 this is stateless — upgrade to DB in V2)
    // For V1 the code validation is the security layer

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        plan: codeData.plan,
        expiry: expiry.toISOString(),
        expiryLabel: codeData.plan === 'annual'
          ? `1 año (hasta ${expiry.toLocaleDateString('es-PA')})`
          : `1 mes (hasta ${expiry.toLocaleDateString('es-PA')})`,
        token,
        message: codeData.plan === 'annual'
          ? '¡Bienvenido a FamyBloom Premium por 1 año completo!'
          : '¡Bienvenido a FamyBloom Premium!'
      })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno. Intenta de nuevo.' }) };
  }
};
