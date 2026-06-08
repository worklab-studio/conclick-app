import { Row, Text, ThemeButton } from '@umami/react-zen';
import { LanguageButton } from '@/components/input/LanguageButton';

export function Header() {
  return (
    <Row as="header" justifyContent="space-between" alignItems="center" paddingY="3">
      <a href="https://app.conclick.io" target="_blank" rel="noreferrer">
        <Row alignItems="center" gap>
          <img
            src="/images/conclick-logo.png"
            alt="Conclick"
            width={26}
            height={26}
            style={{ borderRadius: 7 }}
          />
          <Text weight="bold">Conclick</Text>
        </Row>
      </a>
      <Row alignItems="center" gap>
        <ThemeButton />
        <LanguageButton />
      </Row>
    </Row>
  );
}
