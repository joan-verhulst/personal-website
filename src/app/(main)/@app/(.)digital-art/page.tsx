import DigitalArtPage from "~app/(main)/digital-art/page";
import AppScreen from "~components/layout/app-screen";

// Opened from the home screen: the same page, in the layer over it
const DigitalArtApp = () => {
  return (
    <AppScreen title="Digital Art">
      <DigitalArtPage />
    </AppScreen>
  );
};

export default DigitalArtApp;
