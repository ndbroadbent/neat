/**
 * Extended basic theme with extra widgets (radio, textarea)
 *
 * Side-effect imports like '@sjsf/basic-theme/extra-widgets/radio-include'
 * can be tree-shaken by Vite. This module explicitly creates an extended
 * theme to ensure widgets are always available.
 */
import { extendByRecord } from '@sjsf/form/lib/resolver';
import { theme as baseTheme } from '@sjsf/basic-theme';
import RadioWidget from '@sjsf/basic-theme/extra-widgets/radio.svelte';
import TextareaWidget from '@sjsf/basic-theme/extra-widgets/textarea.svelte';

export const theme = extendByRecord(baseTheme, {
	radioWidget: RadioWidget,
	textareaWidget: TextareaWidget
});
