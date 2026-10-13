// Affiché instantanément pendant le chargement d'un écran connecté, pour que
// l'app réagisse tout de suite au toucher (le contenu arrive ensuite).
export default function Chargement() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-label="Chargement">
      <div className="flex h-16 items-center px-4">
        <div className="h-6 w-36 animate-pulse rounded-full bg-gris" />
      </div>
      <div className="mx-4 h-32 animate-pulse rounded-3xl bg-vert-pale" />
      <div className="mt-4 flex flex-col">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex h-[68px] items-center gap-3 border-b border-trait px-4">
            <div className="h-11 w-11 animate-pulse rounded-full bg-gris" />
            <div className="h-5 flex-1 animate-pulse rounded-full bg-gris" />
          </div>
        ))}
      </div>
    </div>
  );
}
