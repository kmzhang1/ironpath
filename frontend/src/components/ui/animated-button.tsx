import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { Button, buttonVariants } from "@/components/ui/button"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Subtle micro-interaction variants
const animationVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 },
}

const animationTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.15,
}

export interface AnimatedButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  /**
   * Disable animations (useful for disabled state)
   */
  disableAnimation?: boolean
  /**
   * asChild prop from Button component
   */
  asChild?: boolean
}

/**
 * AnimatedButton - A button component with professional micro-interactions
 *
 * Features:
 * - Subtle hover scale (1.02x)
 * - Tap/click feedback (0.98x)
 * - Snappy, eased transitions
 * - Clean and premium feel
 *
 * Usage:
 * ```tsx
 * <AnimatedButton>Click me</AnimatedButton>
 * <AnimatedButton variant="outline" size="sm">Small button</AnimatedButton>
 * <AnimatedButton disabled>Disabled (no animation)</AnimatedButton>
 * ```
 */
export const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, disabled, disableAnimation, variant, size, asChild, ...props }, ref) => {
    // Don't animate if disabled or explicitly disabled
    const shouldAnimate = !disabled && !disableAnimation

    if (!shouldAnimate) {
      return (
        <Button
          ref={ref}
          className={className}
          disabled={disabled}
          variant={variant}
          size={size}
          asChild={asChild}
          {...props}
        />
      )
    }

    return (
      <motion.div
        variants={animationVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        transition={animationTransition}
        style={{ display: 'inline-block' }}
      >
        <Button
          ref={ref}
          className={className}
          variant={variant}
          size={size}
          asChild={asChild}
          {...props}
        />
      </motion.div>
    )
  }
)

AnimatedButton.displayName = "AnimatedButton"

/**
 * For advanced use cases where you need full control over the motion properties,
 * you can use this lower-level component that combines Button styling with motion.button
 */
export const MotionButton = React.forwardRef<
  HTMLButtonElement,
  VariantProps<typeof buttonVariants> & HTMLMotionProps<"button">
>(({ className, variant, size, ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
})

MotionButton.displayName = "MotionButton"
