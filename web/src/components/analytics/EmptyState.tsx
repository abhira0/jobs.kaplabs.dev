// Empty State Component

type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export default function EmptyState({
  title = 'No Data Available',
  description = 'There is no data to display for the selected filters.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && (
        <div className="mb-4 text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted text-center max-w-md">{description}</p>
    </div>
  );
}
