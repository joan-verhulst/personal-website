import PhotographyPage from "~app/(main)/photography/page";
import AppScreen from "~components/layout/app-screen";

// Opened from the home screen: the same page, in the layer over it
const PhotographyApp = () => {
  return (
    <AppScreen title="Photography">
      <PhotographyPage />
    </AppScreen>
  );
};

export default PhotographyApp;
