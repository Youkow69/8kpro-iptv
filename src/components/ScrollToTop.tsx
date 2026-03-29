import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

interface Props {
  scrollRef: React.RefObject<HTMLElement | null>;
}

export default function ScrollToTop({ scrollRef }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setVisible(el.scrollTop > 400);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  if (!visible) return null;

  return (
    <button
      onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-4 z-50 bg-transparent text-white/50 p-2.5 rounded-full transition-all hover:text-white hover:scale-110 active:scale-95"
      aria-label="Scroll to top"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );
}
