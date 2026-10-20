import About from "~app/(main)/about/page";
import AppScreen from "~components/layout/app-screen";
import { ownPages } from "~/data/pages";

const AboutApp = () => {
  return (
    <AppScreen title={ownPages.about.title}>
      <About />
    </AppScreen>
  );
};

export default AboutApp;
