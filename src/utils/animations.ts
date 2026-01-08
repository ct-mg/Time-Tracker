/**
 * Animation Utilities
 * Reusable animation classes and transitions for consistent micro-interactions
 */

// Fade transitions
export const fadeTransition = {
    enterActiveClass: 'transition-opacity duration-200 ease-out',
    enterFromClass: 'opacity-0',
    enterToClass: 'opacity-100',
    leaveActiveClass: 'transition-opacity duration-150 ease-in',
    leaveFromClass: 'opacity-100',
    leaveToClass: 'opacity-0'
};

// Scale transitions
export const scaleTransition = {
    enterActiveClass: 'transition-all duration-200 ease-out',
    enterFromClass: 'opacity-0 scale-95',
    enterToClass: 'opacity-100 scale-100',
    leaveActiveClass: 'transition-all duration-150 ease-in',
    leaveFromClass: 'opacity-100 scale-100',
    leaveToClass: 'opacity-0 scale-95'
};

// Slide transitions
export const slideDownTransition = {
    enterActiveClass: 'transition-all duration-200 ease-out',
    enterFromClass: 'opacity-0 -translate-y-2',
    enterToClass: 'opacity-100 translate-y-0',
    leaveActiveClass: 'transition-all duration-150 ease-in',
    leaveFromClass: 'opacity-100 translate-y-0',
    leaveToClass: 'opacity-0 -translate-y-2'
};

export const slideUpTransition = {
    enterActiveClass: 'transition-all duration-200 ease-out',
    enterFromClass: 'opacity-0 translate-y-2',
    enterToClass: 'opacity-100 translate-y-0',
    leaveActiveClass: 'transition-all duration-150 ease-in',
    leaveFromClass: 'opacity-100 translate-y-0',
    leaveToClass: 'opacity-0 translate-y-2'
};

// List transitions
export const listTransition = {
    enterActiveClass: 'transition-all duration-300 ease-out',
    enterFromClass: 'opacity-0 translate-x-4',
    enterToClass: 'opacity-100 translate-x-0',
    leaveActiveClass: 'transition-all duration-200 ease-in',
    leaveFromClass: 'opacity-100 translate-x-0',
    leaveToClass: 'opacity-0 -translate-x-4',
    moveClass: 'transition-transform duration-300 ease-out'
};

// Bounce effect for success actions
export const bounceClass = 'animate-bounce';

// Pulse effect for loading/active states
export const pulseClass = 'animate-pulse';

// Spin effect for loading spinners
export const spinClass = 'animate-spin';
