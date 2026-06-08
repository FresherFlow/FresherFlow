/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
export const runtime = 'edge';
const size = { width: 1200, height: 630 };
const truncate = (v: string, max: number) => v.length > max ? `${v.slice(0, max - 1)}\u2026` : v;
const getBadgeColors = (t: string) => t === 'INTERNSHIP'
  ? { bg: 'rgba(124,58,237,0.22)', border: 'rgba(167,139,250,0.4)', color: '#c4b5fd' }
  : t === 'CAMPUS DRIVE'
  ? { bg: 'rgba(5,150,105,0.22)', border: 'rgba(52,211,153,0.4)', color: '#6ee7b7' }
  : { bg: 'rgba(37,99,235,0.22)', border: 'rgba(96,165,250,0.4)', color: '#93c5fd' };

function renderCard(mode: 'job' | 'drive') {
  const isDrive = mode === 'drive';
  const title = isDrive ? 'TCS All India NQT Hiring 2026 (Prime + Digital)' : 'Associate Software Engineer';
  const company = isDrive ? 'Tata Consultancy Services' : 'Sprinklr';
  const location = isDrive ? 'PAN India' : 'Gurugram';
  const type = isDrive ? 'CAMPUS DRIVE' : 'JOB';
  const urgency = isDrive ? '\u26a1 Closing in 2d' : null;
  const logoUrl = isDrive ? 'https://www.google.com/s2/favicons?domain=tcs.com&sz=128' : 'https://www.google.com/s2/favicons?domain=sprinklr.com&sz=128';
  const badge = getBadgeColors(type);
  const titleSize = title.length > 52 ? 52 : title.length > 38 ? 62 : 74;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fresherflow.in";
  const siteLogoUrl = `${siteUrl}/logo-white-optimized.png`;

  return new ImageResponse(
    <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', justifyContent:'space-between', background:'#020404', color:'#F5F7F8', padding:'52px 60px', fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <img src={logoUrl} alt={company} width={100} height={100} style={{ borderRadius:24, background:'#fff', objectFit:'contain', padding:10 }} />
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ fontSize:22, color:'rgba(245,247,248,0.38)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase' }}>Hiring at</div>
            <div style={{ fontSize:48, fontWeight:800, color:'#F5F7F8', letterSpacing:'-0.5px' }}>{truncate(company, 34)}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(245,247,248,0.07)', border:'1px solid rgba(245,247,248,0.12)', borderRadius:12, padding:'10px 20px' }}>
          <img src={siteLogoUrl} alt="FresherFlow" width={26} height={26} style={{ objectFit: 'contain' }} />
          <div style={{ fontSize:20, fontWeight:700, color:'#F5F7F8' }}>FresherFlow</div>
        </div>
      </div>

      <div style={{ fontSize:titleSize, fontWeight:900, lineHeight:1.1, color:'#F5F7F8', letterSpacing:'-1px', maxWidth:'1080px' }}>
        {truncate(title, 65)}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ display:'flex', borderRadius:12, padding:'16px 28px', background:badge.bg, border:`1px solid ${badge.border}`, fontSize:24, fontWeight:700, letterSpacing:'0.07em', color:badge.color }}>{type}</div>
        <div style={{ display:'flex', borderRadius:12, padding:'16px 28px', background:'rgba(245,247,248,0.07)', border:'1px solid rgba(245,247,248,0.11)', fontSize:24, fontWeight:600, color:'rgba(245,247,248,0.65)' }}>📍 {location}</div>
        {urgency && <div style={{ display:'flex', borderRadius:12, padding:'16px 28px', background:'rgba(239,68,68,0.16)', border:'1px solid rgba(239,68,68,0.35)', fontSize:24, fontWeight:700, color:'#fca5a5' }}>{urgency}</div>}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginLeft:'auto' }}>
          <div style={{ width:12, height:12, borderRadius:999, background:'#4ade80', display:'flex' }} />
          <div style={{ fontSize:22, fontWeight:600, color:'rgba(245,247,248,0.32)' }}>Verified · fresherflow.in</div>
        </div>
      </div>
    </div>,
    { ...size }
  );
}

export function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get('mode') === 'drive' ? 'drive' : 'job';
  return renderCard(mode);
}
