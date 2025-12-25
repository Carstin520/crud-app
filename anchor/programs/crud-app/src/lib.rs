#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("5Bww75bUi5z4efKDNH9EJQf7Vk1HFjwkCe4261ifrY2x");

#[program]
pub mod crud_app {
    use super::*;

    pub fn create_journal_entry(ctx: Context<CreateJournalEntry>, title: String, message: String) -> Result<()> {
        let journal_entry = &mut ctx.accounts.journal_entry;
        journal_entry.owner = ctx.accounts.owner.key();
        journal_entry.title = title;
        journal_entry.message = message;
        Ok(())
    }

    pub fn update_journal_entry(ctx: Context<UpdateJournalEntry>, _title: String, message: String) -> Result<()> {
        let journal_entry = &mut ctx.accounts.journal_entry;
        
        journal_entry.message = message;
        Ok(())
    }

    pub fn delete_journal_entry(_ctx: Context<DeleteJournalEntry>, _title: String) -> Result<()> {
        
        Ok(())
    }

}

#[account]
#[derive(InitSpace)]
pub struct JournalEntryState {
    pub owner: Pubkey,
    #[max_len(50)]
    pub title: String,
    #[max_len(1000)]
    pub message: String,
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateJournalEntry<'info> {
    #[account(
        init, 
        seeds = [title.as_bytes(), owner.key().as_ref()],
        bump,
        space = 8 + JournalEntryState::INIT_SPACE,
        payer = owner
    )]
    pub journal_entry: Account<'info, JournalEntryState>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_title: String)]
pub struct UpdateJournalEntry<'info> {
    #[account(
        mut, 
        seeds = [_title.as_bytes(), owner.key().as_ref()], 
        bump,
        realloc = 8 + JournalEntryState::INIT_SPACE,
        realloc::payer = owner,
        realloc::zero = true // clear the old data
    )]
    pub journal_entry: Account<'info, JournalEntryState>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_title: String)]
pub struct DeleteJournalEntry<'info> {
    #[account(
        mut,
        seeds = [_title.as_bytes(), owner.key().as_ref()],
        bump,
        close = owner // it has to be the same as the owner
    )]
    pub journal_entry: Account<'info, JournalEntryState>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}