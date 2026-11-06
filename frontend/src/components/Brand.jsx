export default function Brand({ className = "text-2xl" }) {
  return (
    <span className={`font-serif font-bold tracking-tight ${className}`}>
      Plate<span className="text-accent">2</span>Plate
    </span>
  );
}