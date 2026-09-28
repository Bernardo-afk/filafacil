export function Placeholder({ title, story }: { title: string; story?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="font-display text-lg font-semibold text-foreground">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {story ? `Em construção — história ${story}.` : 'Em construção.'}
      </p>
    </div>
  )
}
