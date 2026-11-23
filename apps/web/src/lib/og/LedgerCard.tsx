import { OG_TONES } from './tokens';

/**
 * One template for FresherFlow's brand OG cards: warm paper, navy editorial
 * type, the app's real logo, and one small orange rule. No grid, no decorative
 * illustrations — the message and the brand lockup carry the card.
 *
 * All children use flex or absolute positioning — satori does not lay out
 * normal block flow. Every style is inline because the image renderer cannot
 * read the app's CSS. Assets are passed in as data URIs so no network request
 * is made at render time.
 */
export type LedgerCardProps = {
    /** Data URI for the white runner mark on a navy tile. */
    logo: string | null;
    host: string;
    kicker: string;
    headline: readonly [string, string];
    subline: string;
    footerTag: string;
};

export function LedgerCard({
    logo,
    host,
    kicker,
    headline,
    subline,
    footerTag,
}: LedgerCardProps) {
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: '56px 96px 52px',
                boxSizing: 'border-box',
                backgroundColor: OG_TONES.paper,
                color: OG_TONES.ink,
                fontFamily: OG_TONES.font,
            }}
        >
            {/* Top: brand lockup and market */}
            <div
                style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                        style={{
                            display: 'flex',
                            width: 52,
                            height: 52,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 10,
                            backgroundColor: OG_TONES.ink,
                        }}
                    >
                        {logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logo}
                                alt=""
                                width={42}
                                height={42}
                                style={{ display: 'flex', objectFit: 'contain' }}
                            />
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: 22,
                                    fontWeight: 900,
                                    color: OG_TONES.white,
                                }}
                            >
                                F
                            </div>
                        )}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 30,
                            fontWeight: 800,
                            letterSpacing: 3.4,
                            color: OG_TONES.ink,
                        }}
                    >
                        FRESHERFLOW
                    </div>
                </div>
                <div
                    style={{
                        display: 'flex',
                        fontSize: 18,
                        fontWeight: 700,
                        letterSpacing: 2.6,
                        color: OG_TONES.muted,
                    }}
                >
                    INDIA + REMOTE
                </div>
            </div>

            {/* Message */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: 84,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        fontSize: 20,
                        fontWeight: 700,
                        letterSpacing: 3,
                        color: OG_TONES.muted,
                    }}
                >
                    {kicker}
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: 22,
                        fontSize: 88,
                        fontWeight: 800,
                        lineHeight: 1.04,
                        letterSpacing: -3,
                        color: OG_TONES.ink,
                    }}
                >
                    <span style={{ display: 'flex' }}>{headline[0]}</span>
                    <span style={{ display: 'flex' }}>{headline[1]}</span>
                </div>
                <div
                    style={{
                        display: 'flex',
                        width: 64,
                        height: 4,
                        marginTop: 30,
                        backgroundColor: OG_TONES.orange,
                    }}
                />
                <div
                    style={{
                        display: 'flex',
                        width: 860,
                        marginTop: 22,
                        fontSize: 27,
                        lineHeight: 1.35,
                        color: OG_TONES.muted,
                    }}
                >
                    {subline}
                </div>
            </div>

            {/* Footer */}
            <div
                style={{
                    position: 'absolute',
                    left: 96,
                    right: 96,
                    bottom: 52,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        width: '100%',
                        height: 1,
                        backgroundColor: OG_TONES.hairline,
                    }}
                />
                <div
                    style={{
                        display: 'flex',
                        width: '100%',
                        marginTop: 22,
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 22,
                            fontWeight: 700,
                            color: OG_TONES.ink,
                        }}
                    >
                        {host}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            fontSize: 17,
                            fontWeight: 700,
                            letterSpacing: 2.2,
                            color: OG_TONES.muted,
                        }}
                    >
                        {footerTag}
                    </div>
                </div>
            </div>
        </div>
    );
}
