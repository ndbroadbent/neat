/**
 * Extended basic theme with extra widgets and fields
 *
 * Side-effect imports can be tree-shaken by Vite. This module explicitly
 * creates an extended theme to ensure components are always available.
 */
import { extendByRecord } from '@sjsf/form/lib/resolver';
import { theme as baseTheme } from '@sjsf/basic-theme';
import RadioWidget from '@sjsf/basic-theme/extra-widgets/radio.svelte';
import TextareaWidget from '@sjsf/basic-theme/extra-widgets/textarea.svelte';
import EnumField from '@sjsf/form/fields/extra/enum.svelte';

export const theme = extendByRecord(baseTheme, {
	radioWidget: RadioWidget,
	textareaWidget: TextareaWidget,
	enumField: EnumField
});
