import "./globals.css";

export const metadata = {
  title: "Hostel Calendar | HAC | VIT Bhopal",
  description: "Hostel Calendar for the Hostel Administrative Council, VIT Bhopal.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
