/** Error text linked to its control with `aria-describedby`. Empty when valid. */
export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return (
    <p id={id} className="text-sm font-semibold text-danger">
      {message ?? ''}
    </p>
  );
}
