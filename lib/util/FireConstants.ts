import { Constants, ConstantsColors } from 'discord.js';

export class FireConstants{
    public static pronounMapping: { [x in PronounCode]: Pronoun } = {
		unspecified: 'Unspecified',
		hh: 'He/Him',
		hi: 'He/It',
		hs: 'He/She',
		ht: 'He/They',
		ih: 'It/Him',
		ii: 'It/Its',
		is: 'It/She',
		it: 'It/They',
		shh: 'She/He',
		sh: 'She/Her',
		si: 'She/It',
		st: 'She/They',
		th: 'They/He',
		ti: 'They/It',
		ts: 'They/She',
		tt: 'They/Them',
		any: 'Any pronouns',
		other: 'Other pronouns',
		ask: 'Ask me my pronouns',
		avoid: 'Avoid pronouns, use my name'
	};    
}

export type PronounCode =
	| 'unspecified'
	| 'hh'
	| 'hi'
	| 'hs'
	| 'ht'
	| 'ih'
	| 'ii'
	| 'is'
	| 'it'
	| 'shh'
	| 'sh'
	| 'si'
	| 'st'
	| 'th'
	| 'ti'
	| 'ts'
	| 'tt'
	| 'any'
	| 'other'
	| 'ask'
	| 'avoid';
export type Pronoun =
	| 'Unspecified'
	| 'He/Him'
	| 'He/It'
	| 'He/She'
	| 'He/They'
	| 'It/Him'
	| 'It/Its'
	| 'It/She'
	| 'It/They'
	| 'She/He'
	| 'She/Her'
	| 'She/It'
	| 'She/They'
	| 'They/He'
	| 'They/It'
	| 'They/She'
	| 'They/Them'
	| 'Any pronouns'
	| 'Other pronouns'
	| 'Ask me my pronouns'
	| 'Avoid pronouns, use my name';
