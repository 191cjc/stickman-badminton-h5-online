package ui
{
   import Playtomic.Link;
   import Playtomic.Log;
   import §_-2s§.§_-u§;
   import bobby.§ null§;
   import bobby.§_-0v§;
   import flash.display.SimpleButton;
   import flash.events.Event;
   import flash.events.MouseEvent;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol269")]
   public class FinishOverlay extends § null§
   {
      
      public var moreBtn:SimpleButton;
      
      public var rematchBtn:SimpleButton;
      
      public var nextBtn:SimpleButton;
      
      private var fadingIn:Boolean = true;
      
      private var fading:Boolean = false;
      
      private var dead:Boolean = false;
      
      private var frameNum:Number;
      
      public function FinishOverlay(param1:Number)
      {
         addFrameScript(0,this.frame1);
         super();
         alpha = 0;
         this.frameNum = param1;
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         gotoAndStop(this.frameNum);
         §_-0v§.§_-6-§(this.handleEnterFrame);
         if(currentFrame == 1)
         {
            SimpleButton(this.rematchBtn).addEventListener(MouseEvent.MOUSE_UP,this.tryAgain);
         }
         else
         {
            SimpleButton(this.nextBtn).addEventListener(MouseEvent.MOUSE_UP,this.nextLevel);
         }
         SimpleButton(this.moreBtn).addEventListener(MouseEvent.MOUSE_UP,this.moreClick);
      }
      
      private function moreClick(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§_-2r§,"IngameWinOverlay","SponsorLinks");
         Log.CustomMetric("ClickedSponsorLink","Misc",true);
      }
      
      private function tryAgain(param1:MouseEvent) : void
      {
         if(!this.dead)
         {
            this.dead = true;
            this.fading = true;
            §_-u§(§_-0v§.§_-b§).§return§();
         }
      }
      
      private function nextLevel(param1:MouseEvent) : void
      {
         if(!this.dead)
         {
            this.dead = true;
            this.fading = true;
            §_-u§(§_-0v§.§_-b§).nextLevel();
         }
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
         if(this.fadingIn && !this.fading)
         {
            alpha += 4.5 * param1;
            if(alpha >= 1)
            {
               this.fadingIn = false;
            }
         }
         if(this.fading)
         {
            alpha -= 4.5 * param1;
            if(alpha <= 0)
            {
               remove();
            }
         }
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         §_-0v§.§ do§(this.handleEnterFrame);
         if(currentFrame == 1)
         {
            SimpleButton(this.rematchBtn).removeEventListener(MouseEvent.MOUSE_UP,this.tryAgain);
         }
         else
         {
            SimpleButton(this.nextBtn).removeEventListener(MouseEvent.MOUSE_UP,this.nextLevel);
         }
         SimpleButton(this.moreBtn).removeEventListener(MouseEvent.MOUSE_UP,this.moreClick);
      }
      
      internal function frame1() : *
      {
         stop();
      }
   }
}

