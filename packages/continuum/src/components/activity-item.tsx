import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { IconTile, type IconTileProps } from './icon-tile';

export type ActivityItemProps = Omit<ComponentProps<'li'>, 'title'> &
    Pick<IconTileProps, 'tone'> & {
        icon: ReactNode;
        title: ReactNode;
        time?: ReactNode;
        /** Trailing slot, usually a status Badge. */
        action?: ReactNode;
    };

/** Status-history row from the invoice side sheet. */
export const ActivityItem = ({
    tone,
    icon,
    title,
    time,
    action,
    className,
    ...props
}: ActivityItemProps) => (
    <li
        className={cn('flex items-center gap-4', className)}
        data-slot="activity-item"
        data-tone={tone ?? 'neutral'}
        {...props}
    >
        <IconTile aria-hidden className="rounded-item" tone={tone} variant="outline">
            {icon}
        </IconTile>
        <div className="flex min-w-0 flex-1 flex-col gap-2 text-xs">
            <p className="truncate font-medium text-neutral-900">{title}</p>
            {time != null && <p className="truncate font-normal text-neutral-600">{time}</p>}
        </div>
        {action}
    </li>
);

export const ActivityList = ({ className, ...props }: ComponentProps<'ol'>) => (
    <ol className={cn('flex flex-col gap-6', className)} data-slot="activity-list" {...props} />
);
