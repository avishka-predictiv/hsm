function hashStr(s = "") {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

const AVATAR_COLORS = [
  ["#1a7fe6", "#0c4f9e"],
  ["#10b981", "#065f46"],
  ["#8b5cf6", "#5b21b6"],
  ["#f59e0b", "#b45309"],
  ["#f43f5e", "#be123c"],
  ["#06b6d4", "#0e7490"],
];

export default function Avatar({ name = "", email = "", size = 40, radius = 12 }) {
  const key = name || email;
  const [a, b] = AVATAR_COLORS[hashStr(key) % AVATAR_COLORS.length];
  const initials = name
    ? name
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (email[0] || "U").toUpperCase();

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.36,
        letterSpacing: "-.01em",
        userSelect: "none",
      }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

