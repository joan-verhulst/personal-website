export interface UiUxProject {
  id: string;
  title: string;
  date: string;
  primaryColor: string;
  image: string;
  description: string;
}

export const uiUxProjects: UiUxProject[] = [
  {
    id: "pixel-perfect-agency",
    title: "Pixel Perfect Agency",
    date: "2025",
    primaryColor: "#3A9BD8",
    image: "/assets/images/design_thumbnail.png",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  },
  {
    id: "fintech-dashboard",
    title: "Fintech Dashboard",
    date: "2025",
    primaryColor: "#10B981",
    image: "/assets/images/design_thumbnail.png",
    description:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  },
  {
    id: "health-tracker-app",
    title: "Health Tracker App",
    date: "2024",
    primaryColor: "#F59E0B",
    image: "/assets/images/design_thumbnail.png",
    description:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  },
  {
    id: "e-commerce-redesign",
    title: "E-Commerce Redesign",
    date: "2024",
    primaryColor: "#8B5CF6",
    image: "/assets/images/design_thumbnail.png",
    description:
      "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
  },
  {
    id: "social-media-platform",
    title: "Social Media Platform",
    date: "2024",
    primaryColor: "#EC4899",
    image: "/assets/images/design_thumbnail.png",
    description:
      "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.",
  },
];

export interface UiUxSnippet {
  id: string;
  title: string;
  date: string;
  primaryColor: string;
  image: string;
  description: string;
}

export const uiUxSnippets: UiUxSnippet[] = [
  {
    id: "button-hover-states",
    title: "Button Hover States",
    date: "2025",
    primaryColor: "#8B5CF6",
    image: "/assets/images/design_thumbnail.png",
    description:
      "A collection of creative hover states for buttons, featuring smooth transitions and micro-interactions.",
  },
  {
    id: "card-animations",
    title: "Card Animations",
    date: "2025",
    primaryColor: "#EC4899",
    image: "/assets/images/design_thumbnail.png",
    description:
      "Elegant card animations showcasing entrance effects, hover interactions, and staggered reveals.",
  },
  {
    id: "form-validation",
    title: "Form Validation",
    date: "2024",
    primaryColor: "#10B981",
    image: "/assets/images/design_thumbnail.png",
    description:
      "User-friendly form validation patterns with real-time feedback and accessible error states.",
  },
];
