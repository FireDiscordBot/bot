export class RedditPost {
	readonly id: string
	readonly subreddit: string
	readonly title: string
	readonly author: string
	readonly image: string
	readonly ups: number
	readonly downs: number
	readonly score: number
	readonly comments: number
	readonly nsfw: boolean
	readonly createdUtc: bigint

	constructor(content: any) {
		this.id = content.id
		this.subreddit = content.subreddit
		this.title = content.title
		this.author = content.author
		this.image = content.url
		this.ups = content.ups
		this.downs = content.downs
		this.score = content.score
		this.comments = content.num_comments
		this.nsfw = content.over_18
		this.createdUtc = content.created_utc
	}
}
