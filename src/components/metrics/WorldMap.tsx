import { FloatingTooltip, Column, useTheme, ColumnProps } from '@umami/react-zen';
import { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { colord, extend } from 'colord';
import mixPlugin from 'colord/plugins/mix';
import { ISO_COUNTRIES, MAP_FILE } from '@/lib/constants';

extend([mixPlugin]);
import {
  useWebsiteMetricsQuery,
  useCountryNames,
  useLocale,
  useMessages,
} from '@/components/hooks';
import { formatLongNumber } from '@/lib/format';
import { percentFilter } from '@/lib/filters';
import { getThemeColors } from '@/lib/colors';

export interface WorldMapProps extends ColumnProps {
  websiteId?: string;
  data?: any[];
}

export function WorldMap({ websiteId, data, ...props }: WorldMapProps) {
  const [tooltip, setTooltipPopup] = useState();
  const { theme } = useTheme();
  const { colors } = getThemeColors(theme);
  const { locale } = useLocale();
  const { formatMessage, labels } = useMessages();
  const { countryNames } = useCountryNames(locale);
  const visitorsLabel = formatMessage(labels.visitors).toLocaleLowerCase(locale);
  const unknownLabel = formatMessage(labels.unknown);

  const { data: mapData } = useWebsiteMetricsQuery(websiteId, {
    type: 'country',
  });

  const metrics = useMemo(
    () => (data || mapData ? percentFilter((data || mapData) as any[]) : []),
    [data, mapData],
  );

  const getFillColor = (code: string) => {
    if (code === 'AQ') return;
    const country = metrics?.find(({ x }) => x === code);

    if (!country) {
      return '#27272a'; // Darker gray for empty state
    }

    // Blend dark base with primary purple based on percentage
    return colord('#27272a')
      .mix('#5e5ba4', Math.max(0.2, country.z / 100)) // Ensure at least 20% tint for visibility
      .toHex();
  };

  const getOpacity = (code: string) => {
    return code === 'AQ' ? 0 : 1;
  };

  const handleHover = (code: string) => {
    if (code === 'AQ') return;
    const country = metrics?.find(({ x }) => x === code);
    setTooltipPopup(
      `${countryNames[code] || unknownLabel}: ${formatLongNumber(
        country?.y || 0,
      )} ${visitorsLabel}` as any,
    );
  };

  return (
    <div
      data-tip=""
      data-for="world-map-tooltip"
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    >
      <ComposableMap projection="geoMercator" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
        <ZoomableGroup zoom={0.8} minZoom={0.7} center={[0, 40]}>
          <Geographies geography={`${process.env.basePath || ''}${MAP_FILE}`}>
            {({ geographies }) => {
              return geographies.map(geo => {
                const code = ISO_COUNTRIES[geo.id];

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFillColor(code)}
                    stroke="#18181b"
                    opacity={getOpacity(code)}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: getFillColor(code), stroke: '#5e5ba4', strokeWidth: 1.5 },
                      pressed: { outline: 'none' },
                    }}
                    onMouseOver={() => handleHover(code)}
                    onMouseOut={() => setTooltipPopup(null)}
                  />
                );
              });
            }}
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
      {tooltip && <FloatingTooltip>{tooltip}</FloatingTooltip>}
    </div>
  );
}
