import emailjs from '@emailjs/browser'
import type { Team } from '../types'
import { generateQRUrl } from '../utils/qr'

const EMAILJS_SERVICE_ID = 'service_rqfz62v'
const EMAILJS_TEMPLATE_ID = 'template_p7ym1pe'
const EMAILJS_PUBLIC_KEY = 'dNY0Q3i7W4_VXT4XB'

emailjs.init({
  publicKey: EMAILJS_PUBLIC_KEY
})

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const buildTeamsRows = (teams: Team[]): string => {
  return teams
    .map((team) => {
      const allowed = team.allowedCount || team.membersCount + 3
      const qrUrl = generateQRUrl(team.id, 300)

      return `
        <tr>
          <td style="padding:16px; border-bottom:1px solid #e5e7eb; vertical-align:middle;">
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              ${
                team.teamNumber
                  ? `
                <span style="background:#4f46e5; color:#fff; font-size:15px; font-weight:800; padding:4px 12px; border-radius:20px;">
                  #${team.teamNumber}
                </span>
              `
                  : ''
              }
              <strong style="font-size:16px; color:#111827;">${team.teamName}</strong>
            </div>
          </td>
          <td style="padding:16px; border-bottom:1px solid #e5e7eb; vertical-align:middle; text-align:center;">
            <div style="font-size:15px; font-weight:700; color:#374151;">${team.membersCount} students</div>
            <div style="font-size:13px; color:#dc2626; font-weight:600; margin-top:4px;">✅ ${allowed} allowed to enter</div>
            <div style="font-size:12px; color:#6b7280; margin-top:4px;">(${team.membersCount} students + 1 coach + 2 supervisors)</div>
          </td>
          <td style="padding:16px; border-bottom:1px solid #e5e7eb; vertical-align:middle; text-align:center;">
            <img src="${qrUrl}" width="150" height="150" alt="QR for ${team.teamName}" style="display:block; margin:0 auto 8px auto;" />
            <a href="${qrUrl}" target="_blank" style="display:inline-block; padding:8px 16px; background:#dc2626; color:#fff; text-decoration:none; border-radius:6px; font-size:13px; font-weight:600;">
              🔗 Open QR Code
            </a>
          </td>
        </tr>
      `
    })
    .join('')
}

const buildManagersSection = (academyName: string, teams: Team[]): string => {
  const managers = teams.filter((team) => team.managerName && team.managerEmail)

  if (!managers.length) return ''

  return `
    <h3 style="color:#374151; margin:24px 0 12px 0; font-size:16px;">👤 Academy Manager Access</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
      <thead>
        <tr style="background:#fef2f2;">
          <th style="padding:12px 16px; text-align:left; font-size:13px; color:#6b7280; border-bottom:2px solid #fecaca;">Manager</th>
          <th style="padding:12px 16px; text-align:center; font-size:13px; color:#6b7280; border-bottom:2px solid #fecaca;">Access</th>
          <th style="padding:12px 16px; text-align:center; font-size:13px; color:#6b7280; border-bottom:2px solid #fecaca;">QR Code</th>
        </tr>
      </thead>
      <tbody>
        ${managers
          .map((managerTeam) => {
            const managerQrUrl = generateQRUrl(`manager_${managerTeam.id}`, 300)
            return `
              <tr>
                <td style="padding:16px; border-bottom:1px solid #e5e7eb; vertical-align:middle;">
                  <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">Academy Manager</div>
                  <strong style="font-size:15px;">${managerTeam.managerName}</strong>
                  <div style="font-size:12px; color:#6b7280;">${academyName}</div>
                </td>
                <td style="padding:16px; border-bottom:1px solid #e5e7eb; vertical-align:middle; text-align:center;">
                  <div style="font-size:13px; color:#dc2626; font-weight:600;">✅ 1 person</div>
                </td>
                <td style="padding:16px; border-bottom:1px solid #e5e7eb; vertical-align:middle; text-align:center;">
                  <img src="${managerQrUrl}" width="150" height="150" alt="QR for ${managerTeam.managerName}" style="display:block; margin:0 auto 8px auto;" />
                  <a href="${managerQrUrl}" target="_blank" style="display:inline-block; padding:8px 16px; background:#dc2626; color:#fff; text-decoration:none; border-radius:6px; font-size:13px; font-weight:600;">
                    🔗 Manager QR
                  </a>
                </td>
              </tr>
            `
          })
          .join('')}
      </tbody>
    </table>
  `
}

const buildAcademyEmailHtml = (academyName: string, teams: Team[], partText = ''): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial,sans-serif;">
        <div style="max-width:640px; margin:0 auto; padding:20px;">
          <div style="background:linear-gradient(135deg,#dc2626,#991b1b); color:#fff; padding:30px; border-radius:12px 12px 0 0; text-align:center;">
            <h1 style="margin:0; font-size:24px;">🏆 [UPDATED & FINAL] GRC QR Code</h1>
            <p style="margin:8px 0 0 0; opacity:0.85;">Academy: <strong>${academyName}</strong></p>
          </div>

          <div style="background:#fff; padding:24px; border-radius:0 0 12px 12px; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
            <div style="background:#fef2f2; border:1px solid #f87171; border-radius:8px; padding:16px; margin-bottom:20px;">
              <p style="margin:0; color:#991b1b; font-size:14px; text-align:center;">
                🚨 <strong>IMPORTANT WARNING:</strong><br />
                This is your VALID and FINAL QR code for the <strong>Global Robotics Challenge (GRC)</strong>.
                Any previous QR codes are now INVALID.
              </p>
            </div>

            <p style="color:#374151; margin-bottom:20px;">
              Dear <strong>${academyName}</strong> team,<br /><br />
              Your updated QR codes for the <strong>Global Robotics Challenge (GRC)</strong> are ready.
              Please use ONLY these QR codes to check in on the event day.
            </p>

            <h3 style="color:#374151; margin:0 0 12px 0; font-size:16px;">🏅 Teams${partText}</h3>

            <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:12px 16px; text-align:left; font-size:13px; color:#6b7280; border-bottom:2px solid #e5e7eb;">Team</th>
                  <th style="padding:12px 16px; text-align:center; font-size:13px; color:#6b7280; border-bottom:2px solid #e5e7eb;">Allowed Entry</th>
                  <th style="padding:12px 16px; text-align:center; font-size:13px; color:#6b7280; border-bottom:2px solid #e5e7eb;">QR Code</th>
                </tr>
              </thead>
              <tbody>
                ${buildTeamsRows(teams)}
              </tbody>
            </table>

            ${buildManagersSection(academyName, teams)}

            <div style="background:#fef3c7; border:1px solid #f59e0b; border-radius:8px; padding:16px; margin-bottom:20px;">
              <p style="margin:0; color:#92400e; font-size:14px;">
                📌 <strong>Note:</strong> Each team is allowed to bring <strong>students + 1 coach + 2 supervisors</strong>.
              </p>
            </div>

            <p style="color:#9ca3af; font-size:13px; text-align:center; margin:0;">
              Good luck to all teams! 🚀<br />
              Global Robotics Challenge (GRC)
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

const buildManagerEmailHtml = (academyName: string, managerName: string, managerQrUrl: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
      </head>
      <body style="margin:0; padding:0; background:#f3f4f6; font-family:Arial,sans-serif;">
        <div style="max-width:500px; margin:0 auto; padding:20px;">
          <div style="background:linear-gradient(135deg,#dc2626,#991b1b); color:#fff; padding:30px; border-radius:12px 12px 0 0; text-align:center;">
            <h1 style="margin:0; font-size:22px;">🏆 [UPDATED & FINAL] GRC QR Code</h1>
            <p style="margin:8px 0 0 0; opacity:0.85;">Academy: <strong>${academyName}</strong></p>
          </div>

          <div style="background:#fff; padding:24px; border-radius:0 0 12px 12px; box-shadow:0 4px 12px rgba(0,0,0,0.1); text-align:center;">
            <div style="background:#fef2f2; border:1px solid #f87171; border-radius:8px; padding:16px; margin-bottom:20px;">
              <p style="margin:0; color:#991b1b; font-size:14px;">
                🚨 <strong>IMPORTANT WARNING:</strong><br />
                This is your VALID and FINAL QR code. Previous codes are INVALID.
              </p>
            </div>

            <p style="color:#374151; margin-bottom:20px;">
              Dear <strong>${managerName}</strong>,<br /><br />
              This is your updated personal QR code for entry to the
              <strong>Global Robotics Challenge (GRC)</strong>.
            </p>

            <div style="background:#fef2f2; border:2px solid #fecaca; border-radius:12px; padding:20px; margin-bottom:20px;">
              <div style="font-size:14px; color:#374151; margin-bottom:12px;">
                <strong>Name:</strong> ${managerName}<br />
                <strong>Academy:</strong> ${academyName}<br />
                <strong>Role:</strong> Academy Manager
              </div>

              <img src="${managerQrUrl}" width="200" height="200" style="display:block; margin:0 auto 12px auto;" alt="Your QR Code" />

              <a href="${managerQrUrl}" target="_blank" style="display:inline-block; padding:10px 20px; background:#dc2626; color:#fff; text-decoration:none; border-radius:8px; font-size:14px; font-weight:600;">
                🔗 Open QR Code
              </a>
            </div>

            <p style="color:#9ca3af; font-size:12px;">
              Good luck! 🚀 Global Robotics Challenge (GRC)
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

export const sendQREmail = async (
  academyEmail: string,
  academyName: string,
  teams: Team[]
): Promise<void> => {
  const chunks = chunkArray(teams, 5)

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i]
    const partText = teams.length > 5 ? ` (Part ${i + 1})` : ''

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: academyEmail,
      to_name: academyName,
      email_subject: `[UPDATED & FINAL] GRC QR Code — ${academyName}${partText}`,
      email_html: buildAcademyEmailHtml(academyName, chunk, partText)
    })

    await wait(1500)
  }

  const validManagers = teams.filter(
    (team) =>
      team.managerName &&
      team.managerEmail &&
      team.managerEmail !== academyEmail
  )

  for (const managerTeam of validManagers) {
    const managerQrUrl = generateQRUrl(`manager_${managerTeam.id}`, 300)

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: managerTeam.managerEmail,
      to_name: managerTeam.managerName,
      email_subject: `[UPDATED & FINAL] GRC QR Code — ${academyName} Manager`,
      email_html: buildManagerEmailHtml(
        academyName,
        managerTeam.managerName ?? 'Manager',
        managerQrUrl
      )
    })

    await wait(1500)
  }
}