import About from "~app/(main)/about/page";
import AppScreen from "~components/layout/app-screen";
import { ownPages } from "~/data/pages";

// Opened from the home screen: the same page, in the layer over it
const AboutApp = () => {
  return (
    <AppScreen title={ownPages.about.title}>
      <About />
    </AppScreen>
  );
};

export default AboutApp;
