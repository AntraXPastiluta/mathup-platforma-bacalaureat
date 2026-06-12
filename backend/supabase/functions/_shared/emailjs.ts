export async function sendEmailJsNotification(options: {
  serviceId: string
  templateId: string
  publicKey: string
  privateKey: string
  templateParams: Record<string, string>
  fetchImpl?: typeof fetch
  logContext?: string
}) {
  const fetcher = options.fetchImpl ?? fetch
  const logContext = options.logContext ?? 'emailjs'
  const response = await fetcher('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: options.serviceId,
      template_id: options.templateId,
      user_id: options.publicKey,
      accessToken: options.privateKey,
      template_params: options.templateParams,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error(`[${logContext}] EmailJS failed:`, response.status, detail)
    if (response.status === 403 && detail.includes('non-browser')) {
      throw new Error('EMAILJS_NON_BROWSER_DISABLED')
    }
    throw new Error(`EMAILJS_FAILED:${response.status}`)
  }
}
