import { Row } from '@umami/react-zen';

export function Footer() {
  return (
    <Row as="footer" paddingY="6" justifyContent="center">
      <a
        href="https://app.conclick.io"
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 13, opacity: 0.55 }}
      >
        Powered by <strong>Conclick</strong>
      </a>
    </Row>
  );
}
