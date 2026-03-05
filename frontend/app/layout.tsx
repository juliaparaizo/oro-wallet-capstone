import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Capstone Finance",
  description: "Personal finance dashboard"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Script
          src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"
          strategy="afterInteractive"
        />
        <main>{children}</main>
      </body>
    </html>
  );
}
