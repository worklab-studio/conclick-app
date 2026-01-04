"use client"

import { cn } from "@/lib/utils"
import React, { useState, useRef } from "react"

interface InteractiveGridPatternProps extends React.SVGProps<SVGSVGElement> {
    width?: number
    height?: number
    squares?: [number, number][] // [x, y] coordinates
    className?: string
    squaresClassName?: string
}

export function InteractiveGridPattern({
    width = 40,
    height = 40,
    squares = [[0, 0]],
    className,
    squaresClassName,
    ...props
}: InteractiveGridPatternProps) {
    const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    const onMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current) return
        const rect = svgRef.current.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        // Snap to grid
        const cellX = Math.floor(x / width) * width
        const cellY = Math.floor(y / height) * height

        setHoveredCell([cellX, cellY])
    }

    const onMouseLeave = () => {
        setHoveredCell(null)
    }

    return (
        <svg
            ref={svgRef}
            aria-hidden="true"
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            className={cn(
                "pointer-events-auto absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
                className,
            )}
            {...props}
        >
            <defs>
                <pattern
                    id="interactive-grid-pattern"
                    width={width}
                    height={height}
                    patternUnits="userSpaceOnUse"
                    x={-1}
                    y={-1}
                >
                    <path
                        d={`M.5 ${height}V.5H${width}`}
                        fill="none"
                        strokeDasharray="0"
                    />
                </pattern>
            </defs>
            <rect
                width="100%"
                height="100%"
                strokeWidth={0}
                fill="url(#interactive-grid-pattern)"
            />
            {hoveredCell && (
                <rect
                    x={hoveredCell[0]}
                    y={hoveredCell[1]}
                    width={width}
                    height={height}
                    className={cn("fill-gray-400/30 transition-all duration-0", squaresClassName)}
                />
            )}
        </svg>
    )
}
