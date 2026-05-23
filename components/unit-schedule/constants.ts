import { ShiftColor } from '../../types.ts';

export const SHIFT_COLORS: ShiftColor[] = ['yellow','blue','indigo','green','red','purple','orange','pink','teal','gray'];

export const COLOR_CLASSES: Record<ShiftColor, { badge: string; dot: string }> = {
    yellow:  { badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',  dot: 'bg-yellow-400' },
    blue:    { badge: 'bg-blue-100 text-blue-800 border-blue-300',        dot: 'bg-blue-400' },
    indigo:  { badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',  dot: 'bg-indigo-400' },
    green:   { badge: 'bg-green-100 text-green-800 border-green-300',     dot: 'bg-green-400' },
    red:     { badge: 'bg-red-100 text-red-800 border-red-300',           dot: 'bg-red-400' },
    purple:  { badge: 'bg-purple-100 text-purple-800 border-purple-300',  dot: 'bg-purple-400' },
    orange:  { badge: 'bg-orange-100 text-orange-800 border-orange-300',  dot: 'bg-orange-400' },
    pink:    { badge: 'bg-pink-100 text-pink-800 border-pink-300',        dot: 'bg-pink-400' },
    teal:    { badge: 'bg-teal-100 text-teal-800 border-teal-300',        dot: 'bg-teal-400' },
    gray:    { badge: 'bg-gray-100 text-gray-800 border-gray-300',        dot: 'bg-gray-400' },
};
