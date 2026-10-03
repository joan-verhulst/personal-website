import UiUxPage from "~app/(main)/ui-ux/page";
import AppScreen from "~components/layout/app-screen";

// Opened from the home screen: the same page, in the layer over it
const UiUxApp = () => {
  return (
    <AppScreen title="UI/UX">
      <UiUxPage />
    </AppScreen>
  );
};

export default UiUxApp;
