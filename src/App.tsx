import { useEffect, useRef, useState } from "react";

/**
 * Birthday Drive shell.
 * The 3D experience (Three.js + Cannon + GSAP engine in /birthday-drive) is built to public/game/
 * (see scripts/build-game.sh) and embedded here full-viewport. Query string (e.g. ?quality=low) is forwarded.
 */
export default function App() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const src = `./game/index.html${typeof window !== "undefined" ? window.location.search : ""}${
    typeof window !== "undefined" ? window.location.hash : ""
  }`;

  useEffect(() => {
    // keyboard focus must live inside the game so arrow keys / WASD work immediately
    const t = window.setTimeout(() => frame.current?.focus(), 400);
    const refocus = () => frame.current?.focus();
    window.addEventListener("focus", refocus);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("focus", refocus);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f6c6d0]">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-sm tracking-widest text-[#8a4a62]">
          Loading your gift…
        </div>
      )}
      <iframe
        ref={frame}
        title="Birthday Drive"
        src={src}
        allow="autoplay; fullscreen"
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
