type Props = {
  isPending: boolean;
  savedRecently: boolean;
};

export function AutosaveStatus({ isPending, savedRecently }: Props) {
  return (
    <div className="fixed bottom-4 right-4 text-sm text-muted-foreground">
      {isPending ? "Saving…" : savedRecently ? "Saved ✓" : null}
    </div>
  );
}
