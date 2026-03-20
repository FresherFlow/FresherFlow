import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const size = { width: 1200, height: 630 };

type Mode = 'job' | 'drive';

const parseMode = (value: string | null): Mode => (value === 'drive' ? 'drive' : 'job');

const formatDateLabel = (dt: Date) =>
  dt.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });

function renderCard(mode: Mode) {
  const isDrive = mode === 'drive';
  const now = new Date();
  const deadline = isDrive
    ? new Date('2026-03-20T23:59:00+05:30')
    : new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const title = isDrive
    ? 'TCS All India NQT Hiring 2026 (Prime + Digital)'
    : 'Associate Software Engineer';

  const company = isDrive ? 'Tata Consultancy Services' : 'Sprinklr';
  const location = isDrive ? 'PAN India' : 'Gurugram, hyderabd, chennali , banglore';
  const typeLabel = isDrive ? 'OFF-CAMPUS' : 'FULL-TIME';
  const workModeLabel = isDrive ? 'ONSITE' : 'HYBRID';
  const experienceLabel = isDrive ? '0�2 yrs' : '0�1 yrs';
  const salaryLabel = '7�12 LPA';
  const deadlineTitle = isDrive ? 'Reg Ends' : 'Apply by';
  const deadlineLabel = formatDateLabel(deadline);
  const subtitle = isDrive
    ? 'Prime + Digital � National Level Hiring Drive'
    : 'Product Engineering � Backend Platform Team';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg,#07142d 0%,#0e274f 45%,#153872 100%)',
          color: '#f8fafc',
          padding: '44px',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* TOP */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Company */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              {company[0]}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 16, color: '#cbd5e1' }}>Hiring at</span>
              <span style={{ fontSize: 34, fontWeight: 800 }}>{company}</span>
            </div>
          </div>

          {/* Brand */}
          <div
            style={{
              borderRadius: 999,
              background: 'rgba(2,6,23,.35)',
              border: '1px solid rgba(148,163,184,.18)',
              padding: '6px 12px',
              fontSize: 16,
              fontWeight: 700,
              color: '#dbeafe',
            }}
          >
            FresherFlow
          </div>
        </div>

        {/* MIDDLE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Chips */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[typeLabel, location, workModeLabel].map((txt, i) => (
              <span
                key={i}
                style={{
                  borderRadius: 999,
                  border: '1px solid rgba(186,230,253,.4)',
                  background: i === 0 ? 'rgba(14,116,144,.25)' : 'rgba(2,6,23,.35)',
                  padding: '8px 16px',
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {txt}
              </span>
            ))}
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 66,
              lineHeight: 1.05,
              fontWeight: 900,
              maxWidth: 1080,
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: 26, color: '#cbd5e1', fontWeight: 600 }}>
            {subtitle}
          </div>
        </div>

        {/* BOTTOM (ANCHOR ZONE) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Info Cards */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Experience', value: experienceLabel },
              { label: 'Compensation', value: salaryLabel, strong: true },
              { label: deadlineTitle, value: deadlineLabel, deadline: true },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  padding: '16px 18px',
                  background: item.deadline
                    ? 'rgba(120,53,15,.30)'
                    : 'rgba(2,6,23,.70)',
                  border: item.deadline
                    ? '1px solid rgba(251,191,36,.65)'
                    : '1px solid rgba(148,163,184,.30)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    color: item.deadline ? '#fde68a' : '#bfdbfe',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    letterSpacing: '.05em',
                  }}
                >
                  {item.label}
                </span>

                <span
                  style={{
                    fontSize: item.deadline ? 36 : item.strong ? 34 : 32,
                    fontWeight: 900,
                    color: item.deadline ? '#fde68a' : '#f8fafc',
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Trust line */}
          <div
            style={{
              fontSize: 18,
              color: 'rgba(191,219,254,.9)',
              fontWeight: 600,
            }}
          >
            Verified listing on fresherflow.in
          </div>
        </div>
      </div>
    ),
    size
  );
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = parseMode(searchParams.get('mode'));
  return renderCard(mode);
}






