import { cn } from "@/lib/utils"
import React from "react"

interface CleanCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

export function CleanCard({ className, children, ...props }: CleanCardProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

export function CleanCardHeader({ className, children, ...props }: CleanCardProps) {
    return (
        <div
            className={cn("flex flex-col space-y-1.5 p-6", className)}
            {...props}
        >
            {children}
        </div>
    )
}

export function CleanCardTitle({ className, children, ...props }: CleanCardProps) {
    return (
        <h3
            className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
            {...props}
        >
            {children}
        </h3>
    )
}

export function CleanCardContent({ className, children, ...props }: CleanCardProps) {
    return (
        <div className={cn("p-6 pt-0", className)} {...props}>
            {children}
        </div>
    )
}
