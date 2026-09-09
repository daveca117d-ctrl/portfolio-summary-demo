import localFont from "next/font/local";

// Brand typeface. Regular/Light/Black cover body text and headline weight;
// Condensed Bold is used only for large tabular figures (.figure) and the
// wordmark, matching the tight-tracked condensed treatment on
// morganrealestate.co.uk.
export const helveticaNow = localFont({
  src: [
    { path: "../fonts/HelveticaNowDisplay-Light.otf", weight: "300", style: "normal" },
    { path: "../fonts/HelveticaNowDisplay-Regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/HelveticaNowDisplay-Black.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-helvetica-now",
  display: "swap",
});

export const helveticaNowCondensed = localFont({
  src: [{ path: "../fonts/HelveticaNowDisplay-CondensedBold.otf", weight: "700", style: "normal" }],
  variable: "--font-helvetica-now-condensed",
  display: "swap",
});
