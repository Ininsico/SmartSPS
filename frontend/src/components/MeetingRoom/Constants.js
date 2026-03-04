import {
    Heart, ThumbsUp, Smile, Frown, Flame, Rocket, CheckCircle2 as CheckCircle
} from 'lucide-react';

export const REACTIONS = [
    { key: 'heart', icon: Heart, color: 'text-red-500' },
    { key: 'thumbsup', icon: ThumbsUp, color: 'text-blue-500' },
    { key: 'laugh', icon: Smile, color: 'text-yellow-500' },
    { key: 'sad', icon: Frown, color: 'text-blue-400' },
    { key: 'fire', icon: Flame, color: 'text-orange-500' },
    { key: 'rocket', icon: Rocket, color: 'text-purple-500' },
    { key: 'check', icon: CheckCircle, color: 'text-green-500' }
];

export const reactionByKey = REACTIONS.reduce((acc, r) => ({ ...acc, [r.key]: r }), {});
