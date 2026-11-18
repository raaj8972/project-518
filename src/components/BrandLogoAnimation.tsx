import LottieComponent from 'lottie-react';

const Lottie = (LottieComponent as any).default || LottieComponent;

export default function BrandLogoAnimation({ animationData }: { animationData: unknown }) {
  return <Lottie animationData={animationData} loop style={{ height: '100%', width: '100%' }} />;
}
