import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Section,
} from "@react-email/components";

interface InvitationEmailProps {
  resetUrl: string;
}

export function InvitationEmail({ resetUrl }: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>Starter</Text>
          </Section>
          <Section style={section}>
            <Text style={title}>Zaproszenie do systemu</Text>
            <Text style={text}>Zostałeś zaproszony do systemu.</Text>
            <Text style={text}>
              Kliknij poniższy przycisk, aby ustawić hasło i aktywować swoje
              konto.
            </Text>
            <Button href={resetUrl} style={button}>
              Ustaw hasło
            </Button>
            <Text style={footer}>
              Link wygaśnie za 1 godzinę. Jeśli nie oczekiwałeś tego
              zaproszenia, zignoruj tę wiadomość.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "0 0 48px",
  marginBottom: "64px",
  borderRadius: "8px",
  maxWidth: "600px",
  overflow: "hidden" as const,
};

const section = {
  padding: "32px 48px 0",
};

const title = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
  marginBottom: "24px",
};

const text = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#484848",
  marginBottom: "24px",
};

const button = {
  backgroundColor: "#18181b",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
};

const footer = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#898989",
  marginTop: "32px",
};

const logoSection = {
  backgroundColor: "#18181b",
  padding: "32px 48px",
  borderRadius: "8px 8px 0 0",
  textAlign: "center" as const,
};

const logoText = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold" as const,
  margin: "0",
};
