package ui
{
   import Playtomic.Link;
   import Playtomic.Log;
   import §_-2s§.§_-4o§;
   import bobby.§ null§;
   import bobby.§_-0v§;
   import bobby.§_-6§;
   import flash.display.MovieClip;
   import flash.display.SimpleButton;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.net.SharedObject;
   import flash.text.TextField;
   import flash.utils.setTimeout;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol94")]
   public class WinOverlay extends § null§
   {
      
      public var moreBtn:SimpleButton;
      
      public var kongBtn:SimpleButton;
      
      public var thePaper:MovieClip;
      
      public var menuBtn:SimpleButton;
      
      public var unlockText:TextField;
      
      private var fadingIn:Boolean = true;
      
      private var fading:Boolean = false;
      
      private var dead:Boolean = false;
      
      private var paperNum:Number;
      
      public function WinOverlay(param1:Number)
      {
         addFrameScript(52,this.frame53);
         super();
         this.paperNum = param1;
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         stop();
         setTimeout(play,150);
         MovieClip(this.thePaper.body).gotoAndStop(this.paperNum);
         SimpleButton(this.menuBtn).addEventListener(MouseEvent.MOUSE_UP,this.gotoMenu);
         var _loc2_:SharedObject = SharedObject.getLocal("game");
         var _loc3_:Number = Number(_loc2_.data.unlockLevel);
         if(isNaN(_loc3_))
         {
            _loc3_ = 0;
         }
         _loc3_++;
         §_-6§.§_-1U§("BadmintonChampion",1);
         if(_loc3_ >= 4)
         {
            §_-6§.§_-1U§("BadmintonHallOfFame",1);
         }
         Log.LevelCounterMetric("TimesWon",_loc3_,true);
         _loc2_.data.unlockLevel = _loc3_;
         _loc2_.close();
         if(_loc3_ == 1)
         {
            TextField(this.unlockText).text = "Pirate Pete now unlocked!";
         }
         else if(_loc3_ == 2)
         {
            TextField(this.unlockText).text = "Top Hat Sam now unlocked!";
         }
         else if(_loc3_ == 3)
         {
            TextField(this.unlockText).text = "Flying Toaster now unlocked!";
         }
         else if(_loc3_ == 4)
         {
            TextField(this.unlockText).text = "The Red Dude now unlocked!";
         }
         else
         {
            TextField(this.unlockText).text = "You\'ve kicked some ass today!";
         }
         trace("The Unlock Level is: " + _loc3_);
         SimpleButton(this.moreBtn).addEventListener(MouseEvent.MOUSE_UP,this.moreClick);
         SimpleButton(this.kongBtn).addEventListener(MouseEvent.MOUSE_UP,this.kongClick);
      }
      
      private function moreClick(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§_-2r§,"WinScreenMoreBtn","SponsorLinks");
         Log.CustomMetric("ClickedSponsorLink","Misc",true);
      }
      
      private function kongClick(param1:MouseEvent) : void
      {
         Link.Open(§_-0v§.§_-2r§,"WinScreenLogo","SponsorLinks");
         Log.CustomMetric("ClickedSponsorLink","Misc",true);
      }
      
      private function gotoMenu(param1:MouseEvent) : *
      {
         §_-0v§.§_-5q§(new §_-4o§());
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
         if(this.fadingIn && !this.fading)
         {
            alpha += 1.5 * param1;
            if(alpha >= 1)
            {
               this.fadingIn = false;
            }
         }
         if(this.fading)
         {
            alpha -= 1.5 * param1;
            if(alpha <= 0)
            {
               remove();
            }
         }
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         SimpleButton(this.menuBtn).removeEventListener(MouseEvent.MOUSE_UP,this.gotoMenu);
         SimpleButton(this.moreBtn).removeEventListener(MouseEvent.MOUSE_UP,this.moreClick);
         SimpleButton(this.kongBtn).removeEventListener(MouseEvent.MOUSE_UP,this.kongClick);
      }
      
      internal function frame53() : *
      {
         stop();
      }
   }
}

